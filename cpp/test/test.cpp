#include "../writer.hpp"

int main(int argc, char * args[]) {
  DataMo::Writer writer("./");

  {
    DataMo::MetaProjectItem item("Test project");
    writer.write_data(&item);
  }

  {
    DataMo::ScalarItem item("Loss", 24.128);
    writer.write_data(&item);
  }

  {
    DataMo::ScalarItem item("ValLoss", 12.246);
    writer.write_data(&item);
  }

  {
    DataMo::ScalarItem item("Loss", 22.128);
    writer.write_data(&item);
  }

  {
    DataMo::ScalarItem item("Loss", 23.0123);
    writer.write_data(&item);
  }
  {
    DataMo::ScalarItem item("Very very very long description of a parameter", 2);
    writer.write_data(&item);
  }
  {
    DataMo::TensorItem item("Some tensor", torch::rand({10, 2}));
    writer.write_data(&item);
  }


  return 0;
}